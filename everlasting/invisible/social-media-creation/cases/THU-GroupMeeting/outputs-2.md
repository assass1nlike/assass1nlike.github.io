# 后训练的数学本质：从概率分布投影到策略塑形

## 摘要

后训练可以被统一理解成一个**以预训练模型为先验、以目标行为为约束的策略更新问题**。预训练模型给出一个条件分布 \(\pi_0(y\mid x)\)，后训练通过示范、偏好、规则、验证器或环境反馈定义一个目标函数，然后在尽量不破坏原有能力的前提下，把概率质量重新分配给目标行为。

最核心的优化问题是

$$
\max_\pi\; \mathbb E_{x\sim q}\mathbb E_{y\sim\pi(\cdot\mid x)}[r(x,y)]
-\beta\,\mathbb E_{x\sim q}
\left[\mathrm{KL}\left(\pi(\cdot\mid x)\middle\|\pi_0(\cdot\mid x)\right)\right].
\tag{1}
$$

其中：

- \(q(x)\) 是后训练真正关注的提示、任务和环境分布；
- \(r(x,y)\) 是“什么行为算好”的代理目标；
- \(\pi_0\) 是预训练模型或参考模型；
- \(\beta\) 控制目标优化和保留原能力之间的权衡。

这个式子不是说所有训练算法都严格实现了同一个目标，而是给出了它们共享的**数学骨架**。SFT 主要改变目标条件分布的似然，RLHF/DPO 主要学习偏好诱导的密度比，RLVR 主要通过结果反馈改变成功轨迹的概率。它们都可以看作在模型分布上进行有约束的重新加权。

---

## 1. 预训练模型不是“知识库”，而是一个条件概率先验

对一个输入 \(x\)，语言模型不是直接存储一个答案，而是定义了所有可能序列的概率：

$$
\pi_0(y\mid x)=\prod_{t=1}^{T}\pi_0(y_t\mid x,y_{<t}).
$$

因此，模型中“拥有某种能力”至少有三种不同含义：

1. 存在能够表达该答案的内部表示；
2. 在某些提示下，模型能够给出该答案；
3. 在实际用户分布中，模型会稳定地选择该答案。

预训练主要扩大第一层和第二层的覆盖范围；后训练主要把第二层转化为第三层。换句话说，后训练改变的不是一个静态知识表，而是条件概率：

$$
\pi_0(y\mid x)\quad\longrightarrow\quad \pi_\theta(y\mid x).
$$

“模型会不会”在实际系统里往往等价于“目标答案在当前条件下的概率是否足够高”。即使某个正确解在模型的支持集里，如果它的概率低于一个错误但流畅的解，采样或贪心解码仍然会输出错误结果。后训练的第一种作用，就是把正确、合规、可执行的解从低概率区域推到决策边界的另一侧。

---

## 2. 统一变分问题的精确解：奖励导致指数倾斜

考虑式（1）。对每个固定的 \(x\)，引入归一化约束 \(\sum_y\pi(y\mid x)=1\)，拉格朗日函数为

$$
\mathcal L(\pi,\lambda)=
\sum_y\pi(y\mid x)r(x,y)
-\beta\sum_y\pi(y\mid x)\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}
+\lambda\left(\sum_y\pi(y\mid x)-1\right).
$$

对 \(\pi(y\mid x)\) 求导并令其为零：

$$
r(x,y)-\beta\left(\log\frac{\pi(y\mid x)}{\pi_0(y\mid x)}+1\right)+\lambda=0.
$$

整理可得

$$
\boxed{
\pi^*(y\mid x)=
\frac{\pi_0(y\mid x)\exp(r(x,y)/\beta)}{Z(x)}
},
\tag{2}
$$

其中

$$
Z(x)=\sum_y\pi_0(y\mid x)\exp(r(x,y)/\beta)
$$

是所有候选回答经过奖励加权后的权重之和，称为配分函数。分子 \(\pi_0(y\mid x)e^{r(x,y)/\beta}\) 只是未归一化的权重；除以 \(Z(x)\) 后，各回答的概率之和才等于 1。

记式（1）的目标函数为 \(J(\pi)\)。将式（2）代回去，利用

$$
\log\frac{\pi^*(y\mid x)}{\pi_0(y\mid x)}
=\frac{r(x,y)}{\beta}-\log Z(x),
$$

可得

$$
\begin{aligned}
J(\pi^*)
&=\mathbb E_{x\sim q,y\sim\pi^*}
\left[r(x,y)-\beta\log\frac{\pi^*(y\mid x)}{\pi_0(y\mid x)}\right]\\
&=\mathbb E_{x\sim q,y\sim\pi^*}[\beta\log Z(x)]\\
&=\beta\,\mathbb E_{x\sim q}[\log Z(x)].
\end{aligned}
\tag{3}
$$

也就是说，\(\beta\log Z(x)\) 给出了在提示 \(x\) 下，综合奖励收益和偏离参考模型的代价后能达到的最优值。

这给出几个非常重要的结论。

### 2.1 后训练首先是“指数重加权”，不是凭空创造

如果两个回答 \(y_1,y_2\) 在预训练模型中的概率比为

$$
\frac{\pi_0(y_1\mid x)}{\pi_0(y_2\mid x)},
$$

后训练之后的概率比变为

$$
\frac{\pi^*(y_1\mid x)}{\pi^*(y_2\mid x)}
=
\frac{\pi_0(y_1\mid x)}{\pi_0(y_2\mid x)}
\exp\left(\frac{r(x,y_1)-r(x,y_2)}{\beta}\right).
\tag{4}
$$

奖励差异只负责乘上一个指数因子。原模型完全没有支持的行为，无法通过纯粹的分布重加权得到；原模型已经表达但概率很低的行为，则可能被后训练显著放大。

### 2.2 \(\beta\) 是一种“行为温度”

- \(\beta\to\infty\)：奖励影响趋近于零，\(\pi^*\approx\pi_0\)；
- \(\beta\to0\)：模型趋向只保留最高奖励行为；
- 中等 \(\beta\)：在保留多样性和追求目标之间折中。

因此，KL 惩罚并不只是一个工程稳定项。它决定模型究竟是在“温和地改变行为”，还是在“近似贪心地追逐奖励”。

### 2.3 后训练可以看成贝叶斯更新

贝叶斯更新把候选假设的先验概率乘以新证据的似然，再做归一化：

$$
p(y\mid x,E)=\frac{p(y\mid x)p(E\mid x,y)}{\sum_{y'}p(y'\mid x)p(E\mid x,y')}.
$$

这里 \(E\) 表示新证据，\(p(E\mid x,y)\) 衡量候选 \(y\) 对这份证据的解释程度。式（2）具有相同的结构：\(\pi_0(y\mid x)\) 提供更新前的概率，\(e^{r(x,y)/\beta}\) 给高奖励回答更大的权重，\(Z(x)\) 负责归一化。由于这个权重由奖励构造，而不必来自某个观测事件的真实似然，所以称为广义贝叶斯更新。

预训练提供广泛先验，后训练提供任务相关证据。这个观点解释了为什么一个强大的基础模型通常比从零开始的模型更容易对齐：它的先验已经把大量合理候选答案放进了支持集。

---

## 3. SFT 是目标行为分布上的信息投影

设示范数据来自某个目标分布 \(p_D(y\mid x)\)。标准 SFT 最小化

$$
\mathcal L_{\rm SFT}(\theta)
=-\mathbb E_{x\sim q,\,y\sim p_D(\cdot\mid x)}
\log\pi_\theta(y\mid x).
\tag{5}
$$

由于

$$
\mathbb E_{p_D}[-\log\pi_\theta]
=H(p_D)+\mathrm{KL}(p_D\|\pi_\theta),
$$

其中 \(H(p_D)=-\mathbb E_{y\sim p_D}\log p_D(y\mid x)\) 是给定提示时示范分布的熵。示范分布固定，因此这一项与模型参数 \(\theta\) 无关，最小化交叉熵就等价于最小化剩下的 KL 项。

令 \(\Pi=\{\pi_\theta:\theta\in\Theta\}\)，其中 \(\Theta\) 是允许训练的参数集合；\(\Pi\) 就是这些参数能够表示的所有条件概率分布。于是 SFT 的最优模型可以写为

$$
\pi_{\rm SFT}
=\arg\min_{\pi\in\Pi}\mathbb E_{x\sim q}
\mathrm{KL}\left(p_D(\cdot\mid x)\middle\|\pi(\cdot\mid x)\right).
\tag{6}
$$

这里的“投影”就是：在模型能够表示的分布中，选择一个使上述 KL 最小的分布。若模型无法精确表示 \(p_D\)，便用这个准则寻找最接近它的可实现分布。

### 3.1 为什么少量高质量数据可能非常有效

设理想示范的联合分布为 \(P_*(x,y)\)，实际收集的数据来自 \(P_D(x,y)\)。在固定参数 \(\theta\) 处，单个样本的损失梯度为

$$
g(x,y)=-\nabla_\theta\log\pi_\theta(y\mid x),\qquad
g_* = \mathbb E_{P_*}[g(x,y)].
$$

\(g_*\) 是希望沿其负方向更新的目标梯度。从 \(P_D\) 独立采样 \(n\) 条示范，得到梯度估计 \(\hat g_n=n^{-1}\sum_{i=1}^n g(x_i,y_i)\)。定义采集分布造成的偏差 \(b_D=\mathbb E_{P_D}[g]-g_*\)，以及单样本梯度的协方差矩阵 \(\Sigma_D=\operatorname{Cov}_{P_D}(g)\)，则

$$
\mathbb E\|\hat g_n-g_*\|^2
=\|b_D\|^2+\frac{\operatorname{tr}(\Sigma_D)}{n}.
$$

右边分别是系统偏差和采样方差；\(\operatorname{tr}(\Sigma_D)\) 是各梯度分量方差的总和。增加样本数只能降低第二项，不能消除错误或偏离目标的示范所造成的第一项。比较高质量数据集 \(H\) 和低质量数据集 \(L\)，即使 \(n_H<n_L\)，只要

$$
\|b_H\|^2+\frac{\operatorname{tr}(\Sigma_H)}{n_H}
<\|b_L\|^2+\frac{\operatorname{tr}(\Sigma_L)}{n_L},
$$

少量高质量数据给出的梯度估计就更接近目标梯度。关键在于数据是否减少偏差并有效覆盖目标行为，而不只是条数。

LIMA 提供了少量高质量数据有效的经验例子：1,000 条高质量示范就能显著改变 65B 模型的指令行为。它并不意味着 1,000 条数据包含了全部知识，而是意味着预训练模型已经提供了丰富先验，SFT 只需告诉它“应该从哪些行为模式中选择”。

### 3.2 SFT 的方向性：覆盖模式，但不等于学会偏好

式（6）中的 KL 是 \(\mathrm{KL}(p_D\|\pi)\)。它会惩罚模型没有覆盖示范分布中的模式，因此倾向于覆盖所有出现过的合理答案。如果一个问题存在多个不同但都正确的答案，足够多样化的示范有助于保持多样性。

但单个示范只告诉模型“这个答案可以”，并不告诉它“另一个答案更差”。这正是偏好学习的作用：偏好数据提供相对排序，而不是单一模仿目标。

### 3.3 teacher forcing 与暴露偏差

SFT 的 token 损失在训练时使用真实前缀 \(y^*_{<t}\)：

$$
-\sum_t\log\pi_\theta(y_t^*\mid x,y^*_{<t}).
$$

推理时，模型却使用自己生成的前缀 \(\hat y_{<t}\)。因此训练分布和推理分布存在偏差：

$$
(x,y^*_{<t})\neq(x,\hat y_{<t}).
$$

这说明 SFT 更像是在学习一条“示范轨迹”，而不是直接优化模型在自身错误状态下如何恢复。RL、过程监督和 on-policy 数据的价值之一，就是让训练分布接近模型实际运行时会访问的状态。

---

## 4. RLHF 和 DPO：偏好学习本质上是在估计密度比

设人类偏好由潜在奖励 \(r^*(x,y)\) 产生，并且最优策略满足式（2）：

$$
\pi^*(y\mid x)
\propto \pi_0(y\mid x)e^{r^*(x,y)/\beta}.
$$

取对数：

$$
r^*(x,y)=
\beta\log\frac{\pi^*(y\mid x)}{\pi_0(y\mid x)}
+\beta\log Z(x).
\tag{7}
$$

对于同一个问题的两个回答，归一化项相消：

$$
r^*(x,y^+)-r^*(x,y^-)
=\beta\left[
\log\frac{\pi^*(y^+\mid x)}{\pi_0(y^+\mid x)}
-
\log\frac{\pi^*(y^-\mid x)}{\pi_0(y^-\mid x)}
\right].
\tag{8}
$$

如果偏好服从 Bradley–Terry 模型，DPO 直接最小化

$$
\mathcal L_{\rm DPO}
=-\mathbb E_{(x,y^+,y^-)}
\log\sigma\left(
\beta\left[
\log\frac{\pi_\theta(y^+\mid x)}{\pi_0(y^+\mid x)}
-
\log\frac{\pi_\theta(y^-\mid x)}{\pi_0(y^-\mid x)}
\right]
\right).
\tag{9}
$$

这揭示了 DPO 的本质：

> DPO 并不是完全绕开奖励模型，而是把奖励模型隐式地表示为当前模型相对于参考模型的 log-density ratio。

因此，“DPO 比 RLHF 简单”并不意味着它没有目标函数；它只是把奖励估计和策略更新合并到一个离线分类损失中。

### 4.1 RLHF 和 DPO 的真正差异

典型的 RLHF/PPO 流程先用偏好数据训练显式奖励模型，再让当前策略采样回答、获得奖励并更新，近似求解式（1）。它能持续探索偏好数据中没有的新回答，但探索也可能发现奖励模型的漏洞，训练还需要协调采样、奖励评估和策略更新。

标准 DPO 直接使用固定的偏好对，通过式（9）拟合两个回答相对于参考模型的 log 概率差，不需要单独训练奖励模型或在每轮更新时生成新回答，因此工程流程更简单。它学到的排序能否推广到新回答，取决于偏好数据的覆盖和模型的泛化能力。

---

## 5. 模式选择与模式内生成的变化

为了进一步区分行为概率为什么改变，假设回答过程可以分成两步：先选择模式 \(z\)，再在该模式下生成回答。\(z\) 可以表示直接回答、分步推理或调用工具等策略；这是一个分析用的潜变量，不要求模型内部存在显式的模式选择器。基础模型写成

$$
\pi_0(y\mid x)=\sum_z p_0(z\mid x)\pi_0(y\mid x,z),
\tag{10}
$$

其中 \(p_0(z\mid x)\) 是选择模式的概率，\(\pi_0(y\mid x,z)\) 是选定模式后生成回答的条件分布。采用同一组模式描述后训练模型，有

$$
\pi_\theta(y\mid x)=\sum_z p_\theta(z\mid x)\pi_\theta(y\mid x,z).
\tag{11}
$$

两者之差可以精确分成两项：

$$
\begin{aligned}
\pi_\theta(y\mid x)-\pi_0(y\mid x)
={}&\underbrace{\sum_z[p_\theta(z\mid x)-p_0(z\mid x)]
\pi_0(y\mid x,z)}_{\text{选择模式的概率改变}}\\
&+\underbrace{\sum_z p_\theta(z\mid x)
[\pi_\theta(y\mid x,z)-\pi_0(y\mid x,z)]}_{\text{模式内生成回答的分布改变}}.
\end{aligned}
\tag{12}
$$

第一项表示选择已有策略的频率改变，例如模型更常选择分步推理。第二项表示使用同一策略时，生成回答的分布也发生变化，例如同样选择分步推理，模型现在能更准确地完成中间步骤。若所有模式内的生成分布保持不变，第二项为零，变化才完全来自模式权重的重新分配。

第 2.1 节描述最优回答分布如何随奖励变化；这里进一步拆解这种分布变化可以由哪些机制实现。仅凭最终正确率上升，无法确定增益来自哪一项，需要分别比较模式选择频率与给定模式下的表现。

---

## 6. KL 如何衡量行为分布的局部变化

相同大小的参数更新，对输出概率的影响可能完全不同。为了度量行为变化，固定提示分布 \(q\)，定义更新前后模型的平均 KL：

$$
D(\Delta\theta)=\mathbb E_{x\sim q}
\mathrm{KL}\left(\pi_{\theta+\Delta\theta}(\cdot\mid x)
\middle\|\pi_\theta(\cdot\mid x)\right).
$$

这里 \(\Delta\theta\) 是参数更新向量。令

$$
s_\theta(x,y)=\nabla_\theta\log\pi_\theta(y\mid x),\qquad
F(\theta)=\mathbb E_{x\sim q,y\sim\pi_\theta}
[s_\theta(x,y)s_\theta(x,y)^\top].
$$

\(s_\theta\) 表示各参数对回答 log 概率的影响，\(F\) 称为 Fisher 信息矩阵。它把这些影响的乘积按当前模型的回答概率取平均，因此
\(\Delta\theta^\top F\Delta\theta=\mathbb E[(s_\theta^\top\Delta\theta)^2]\)，衡量这次更新引起的 log 概率一阶变化的均方大小。

在分布光滑、支持集不随参数改变，并可交换求导与求和时，\(D\) 在零更新处的值、一阶导数和二阶导数分别为 \(0\)、\(0\) 和 \(F\)。因此 Taylor 展开给出

$$
\begin{aligned}
D(\Delta\theta)
&=D(0)+\nabla D(0)^\top\Delta\theta
+\frac12\Delta\theta^\top\nabla^2D(0)\Delta\theta
+o(\|\Delta\theta\|^2)\\
&=\frac12\Delta\theta^\top F(\theta)\Delta\theta
+o(\|\Delta\theta\|^2).
\end{aligned}
\tag{13}
$$

设要提高的目标为 \(J(\theta)\)，其梯度为 \(g=\nabla_\theta J(\theta)\)。用一阶近似 \(J(\theta+\Delta\theta)-J(\theta)\approx g^\top\Delta\theta\)，并要求平均 KL 不超过 \(\epsilon>0\)，就得到局部更新问题

$$
\max_{\Delta\theta}\;g^\top\Delta\theta
\quad\text{s.t.}\quad
\frac12\Delta\theta^\top F\Delta\theta\le\epsilon.
$$

若 \(F\) 在所考虑的更新空间上正定且 \(g\ne0\)，拉格朗日函数的一阶条件是 \(g-\lambda F\Delta\theta=0\)。结合取等号的约束，可得

$$
\Delta\theta
=\sqrt{\frac{2\epsilon}{g^\top F^{-1}g}}\,F^{-1}g.
\tag{14}
$$

\(F^{-1}g\) 就是自然梯度方向：在对输出概率敏感的参数方向上少走一些，在不敏感的方向上可以多走一些，使给定行为变化预算内的目标增益最大。这里所谓的“几何”，就是用行为分布的变化而非参数向量的欧氏长度衡量一步走了多远。

TRPO 用相邻策略的 KL 约束落实这一思路；PPO 的概率比裁剪近似抑制过大的策略更新，但不严格保证 KL 上界。RLHF 中相对于固定参考模型的 KL 惩罚则控制训练的累计偏离，与这里相邻两步之间的 KL 有不同作用。

### 6.1 参数高效微调为什么常常够用

如果目标行为只需要改变模型输出分布的低维方向，那么全参数更新是过度自由的。LoRA、Adapter 等方法把更新限制在一个低秩子空间：

$$
\Delta W=AB^\top,\qquad \mathrm{rank}(AB^\top)\ll \min(d_{\rm in},d_{\rm out}).
$$

从几何角度看，这相当于只允许模型沿少数行为方向移动。对格式、风格、领域术语和部分工具协议，这类低维改变往往足够；对需要大规模新知识或深层基础表示的任务，则可能不够。

---

## 7. 为什么会遗忘、模式坍缩和过度拒答

### 7.1 梯度冲突导致能力—行为权衡

设通用能力损失为 \(L_g\)，目标行为损失为 \(L_t\)，实际训练目标为

$$
L=\alpha L_g+(1-\alpha)L_t.
\tag{15}
$$

一次更新中两者梯度的夹角决定了权衡：

$$
\cos(g_g,g_t)=
\frac{g_g^\top g_t}{\|g_g\|\|g_t\|}.
$$

- 夹角为正：目标训练同时帮助通用能力；
- 夹角接近零：目标行为与通用能力近似独立；
- 夹角为负：优化目标行为会损害某些通用能力。

窄领域 SFT、强拒答训练和过度压缩回答都可能造成负梯度夹角。所谓“对齐税”可以被理解为目标行为梯度和某些通用能力梯度之间的冲突。

### 7.2 奖励偏差如何被优化利用

设真实目标为 \(r\)，训练使用的代理奖励为 \(\hat r=r+\varepsilon\)，其中 \(\varepsilon(x,y)\) 表示代理对回答的高估或低估。奖励存在偏差，意味着评分不准确；reward hacking 则是策略利用评分规则或评估器的漏洞，获得更高代理奖励，却没有实现对应的真实目标。

用 \(\hat r\) 优化后得到

$$
\hat\pi(y\mid x)
\propto\pi_0(y\mid x)\exp((r(x,y)+\varepsilon(x,y))/\beta).
\tag{16}
$$

将它与按真实奖励优化的 \(\pi^*\) 比较，有

$$
\frac{\hat\pi(y\mid x)}{\pi^*(y\mid x)}
=\frac{e^{\varepsilon(x,y)/\beta}}
{\mathbb E_{y'\sim\pi^*(\cdot\mid x)}[e^{\varepsilon(x,y')/\beta}]}.
$$

因此，代理高估越多的回答，相对于真实目标下的最优分布就会获得越大的额外权重；\(\beta\) 越小，这种倾向越强。如果偏差只是同一提示下的常数，它会在归一化时消掉，策略不受影响。真正可能被利用的是不同回答之间的评分误差。

当优化使策略越来越倾向于利用这些误差，例如通过欺骗评判器或绕过测试获得高分，奖励偏差便转化为 reward hacking。上式揭示的是这种利用发生的机制；判断它是否发生，需要观察策略具体利用了什么漏洞，以及真实质量是否随代理奖励一起改善。

### 7.3 为什么会过度拒答

假设回答集合中有帮助回答 \(H\)、合理拒答 \(R\) 和过度拒答 \(O\)。如果安全奖励只区分“回答是否有风险”，而没有给帮助性足够权重，则可能出现

$$
r(O)>r(H)
$$

的局部区域。式（2）会自动把概率质量从 \(H\) 推向 \(O\)，即使 \(O\) 对无害问题并不是理想行为。要避免这种情况，奖励必须同时编码安全、帮助性、真实性和上下文相关性，或者通过多目标约束显式处理冲突。

---

## 8. RLVR 与“推理涌现”：奖励改变的是轨迹搜索分布

固定提示 \(x\)，将生成过程写成轨迹 \(\tau=(y_1,\ldots,y_T)\)，轨迹概率为 \(\pi_\theta(\tau\mid x)=\prod_{t=1}^T\pi_\theta(y_t\mid x,y_{<t})\)。验证器给出最终奖励 \(R(\tau)\)，它在给定轨迹后不直接依赖模型参数。目标是最大化平均奖励 \(J_x(\theta)=\mathbb E_{\tau\sim\pi_\theta(\cdot\mid x)}[R(\tau)]\)。

引入只依赖提示、不依赖本次采样轨迹的基线 \(b(x)\)，例如当前策略在该提示上的平均奖励估计。它用于把奖励转成“比通常表现好多少”的信号。求梯度时将其视为常量，由于 \(\sum_\tau\pi_\theta(\tau\mid x)=1\)，有

$$
\begin{aligned}
\nabla_\theta J_x
&=\sum_\tau R(\tau)\nabla_\theta\pi_\theta(\tau\mid x)\\
&=\sum_\tau\pi_\theta(\tau\mid x)R(\tau)
\nabla_\theta\log\pi_\theta(\tau\mid x)\\
&=\mathbb E_{\tau\sim\pi_\theta}[R(\tau)\nabla_\theta\log\pi_\theta(\tau\mid x)]
-b(x)\underbrace{\nabla_\theta\sum_\tau\pi_\theta(\tau\mid x)}_{0}\\
&=\mathbb E_{\tau\sim\pi_\theta}
[(R(\tau)-b(x))\nabla_\theta\log\pi_\theta(\tau\mid x)]\\
&=\mathbb E_{\tau\sim\pi_\theta}
\left[(R(\tau)-b(x))
\sum_{t=1}^{T}\nabla_\theta\log\pi_\theta(y_t\mid x,y_{<t})\right].
\end{aligned}
\tag{17}
$$

因此，减去这样的基线不会改变梯度的期望，合适的基线可以降低采样估计的方差。若同时训练多个提示，对上式再取 \(x\sim q\) 的期望，即得到总目标 \(J(\theta)=\mathbb E_{x\sim q}J_x(\theta)\) 的梯度。

对一次采样，若 \(R(\tau)>b(x)\)，梯度上升会沿增大该轨迹 log 概率的方向更新；若 \(R(\tau)<b(x)\)，方向相反。分步推理、反思或验证等生成模式若持续带来正的奖励优势，就有机会通过这种更新变得更常见。

因此，RLVR 的“推理能力”可以被理解为：

1. 模型产生多个候选轨迹；
2. 验证器为各条轨迹给出结果奖励；
3. 奖励减去基线后，作为整条轨迹中各 token 的更新权重；
4. 这些局部模式逐渐成为更高概率的搜索策略。

这解释了为什么 DeepSeekMath、DeepSeek-R1 等工作能在数学和代码任务上观察到自我验证、动态策略和较长推理链。但终端奖励并不自动保证：

- 中间推理是真实的因果依据；
- 推理链中的每一步都正确；
- 模型在没有验证器的新领域里仍然可靠。

它首先优化的是“产生一个通过检查器的轨迹”，而不是“产生一条人类可解释的证明”。

---

## 9. 泛化：后训练的真正瓶颈是目标分布，而不只是参数规模

令 \(\mathcal X\) 为所有可能提示的集合，每个 \(x\in\mathcal X\) 是一段完整输入，可以包含用户问题、历史对话和任务说明。\(q_{\rm train}(x)\) 与 \(q_{\rm test}(x)\) 分别表示训练和实际使用时遇到该输入的概率，均满足 \(q(x)\ge0\) 且 \(\sum_{x\in\mathcal X}q(x)=1\)。它们是定义在提示集合上的概率质量函数，可以看作一个由提示索引、通常极大的概率向量，不要求服从高斯分布等特定形状。若训练时均匀抽取 \(N\) 条记录，其经验分布就是 \(q_{\rm train}(x)=\#\{i:x_i=x\}/N\)。

固定一个策略 \(\pi(y\mid x)\)，假设同一个奖励函数在训练和部署时都适用，且 \(0\le r(x,y)\le1\)。定义

$$
R_\pi(x)=\mathbb E_{y\sim\pi(\cdot\mid x)}[r(x,y)]\in[0,1],
$$

即模型面对提示 \(x\) 时的平均奖励。两种提示分布的总变差距离定义为

$$
\|q_{\rm test}-q_{\rm train}\|_{\rm TV}
=\frac12\sum_{x\in\mathcal X}|q_{\rm test}(x)-q_{\rm train}(x)|.
$$

它在 0 到 1 之间，衡量把一个分布变成另一个分布需要搬动多少概率质量。此时有

$$
\left|
\mathbb E_{x\sim q_{\rm test}}R_\pi(x)
-\mathbb E_{x\sim q_{\rm train}}R_\pi(x)
\right|
\le\|q_{\rm test}-q_{\rm train}\|_{\rm TV}.
\tag{18}
$$

证明只需令 \(\delta(x)=q_{\rm test}(x)-q_{\rm train}(x)\)。因为 \(\sum_x\delta(x)=0\)，正差额总和与负差额绝对值总和相等，均为总变差距离。再利用 \(0\le R_\pi(x)\le1\)，得到

$$
\begin{aligned}
-\|q_{\rm test}-q_{\rm train}\|_{\rm TV}
&=\sum_{\delta(x)<0}\delta(x)\\
&\le\sum_x\delta(x)R_\pi(x)\\
&\le\sum_{\delta(x)>0}\delta(x)\\
&=\|q_{\rm test}-q_{\rm train}\|_{\rm TV}.
\end{aligned}
$$

中间项正是测试平均奖励与训练平均奖励之差，取绝对值即得式（18）。它说明提示分布接近时，同一策略的平均奖励也接近；分布差异大时，这个界就无法提供有用保证。

对数似然训练还会受到支持集问题影响：当训练数据只覆盖少数表达方式时，模型可能学会正确答案的某种表面形式，却无法处理同一意图的改写。解决办法包括：

- 扩大提示和任务覆盖；
- 混合自然用户数据、合成数据和对抗数据；
- 评估未见任务、未见模板和分布外安全场景；
- 使用检索和工具处理需要外部信息的部分；
- 通过在线采样让训练分布逐步靠近实际策略访问分布。

“后训练是分布拟合”这个判断并非贬义。所有监督学习都在拟合分布；真正的问题是拟合的分布是否代表了部署时需要的行为，以及目标函数是否仍然对应真实质量。

---

## 10. 三个可以作为判断依据的命题

### 命题一：后训练不能可靠地产生基础模型完全不支持的行为

在固定支持集的理想化情况下，若 \(\pi_0(y\mid x)=0\)，则式（2）中 \(\pi^*(y\mid x)=0\)。因此纯奖励重加权只能放大已有支持集中的行为。

现实神经网络通常对大量序列分配非零概率，且参数更新会改变支持集的近似边界，所以这不是严格的工程禁令。但它给出正确直觉：**后训练的增益受基础模型表示和数据覆盖的上限约束。**

### 命题二：高奖励不等于高真实质量

如果训练奖励 \(\hat r\) 与真实质量 \(r\) 之间存在误差，低温度优化会按 \(\exp(\hat r/\beta)\) 放大误差。故奖励优化越激进，对奖励模型校准、独立评估和分布外数据的要求越高。

### 命题三：后训练的最佳强度取决于目标的确定性

如果目标行为高度明确（例如 JSON 格式、编译通过、数学答案正确），可以使用较强的 SFT 或 RLVR；如果目标高度主观且多峰（例如创意写作、不同文化下的礼貌），过强的单一奖励会导致模式坍缩和偏好霸权，应保留参考模型、使用多样化偏好和条件化目标。

---

## 11. 一个更精确的本质表述

可以把后训练写成三个连续的数学操作：

### 第一步：定义一个目标测度

示范、偏好、规则和验证器把“好行为”定义为一个目标测度或能量函数：

$$
\mu_{\rm target}(y\mid x)\propto e^{r(x,y)/\beta}.
$$

### 第二步：在模型族中做投影

模型不能任意表示这个目标测度，只能在参数化分布族 \(\Pi\) 中寻找近似：

$$
\pi_\theta=\operatorname{Proj}_{\Pi}(\mu_{\rm target};\pi_0).
$$

SFT 更接近从示范分布到模型分布的正向 KL 投影；KL 正则 RL 更接近在参考策略附近的受约束投影；DPO 用偏好比值间接实现该投影。

### 第三步：在实际访问分布上闭环校正

模型更新后，对同一提示生成的回答也会变化。下一轮数据可以先采样提示 \(x\sim q\)，再用当前模型采样回答 \(y\sim\pi_\theta(\cdot\mid x)\)。由概率乘法公式，这批新样本所服从的联合分布为

$$
p_{\rm next}(x,y)=q(x)\pi_\theta(y\mid x).
$$

这里 \(q\) 描述遇到哪些提示，\(\pi_\theta\) 描述当前模型会给出哪些回答，\(p_{\rm next}\) 描述哪些“提示与回答”组合会进入下一轮采样。对这些回答重新评分、构造偏好或挑选示范，再用于更新模型，就能针对当前模型实际产生的错误继续训练。

这是在线 RL、拒绝采样、self-play、红队和迭代数据构造的共同逻辑。

因此，后训练不是一次性“把正确答案写进参数”，而是一个分布随策略变化的闭环控制问题。

---

## 12. 最终 insight

最值得保留的不是某个具体算法，而是下面这组判断：

1. **预训练决定可表达的能力空间，后训练决定该空间中的行为测度。**
2. **SFT 主要做模仿分布的投影；偏好优化主要做相对概率重排；RLVR 主要做成功轨迹的信用分配。**
3. **后训练的增益通常来自把低概率但有用的行为变成高概率行为。**
4. **所谓“新能力”必须区分新知识、新组合、新搜索策略和单纯的能力激活。**
5. **KL 约束、参考模型和混合数据是在控制分布移动的半径；它们决定后训练是精细塑形还是粗暴重写。**
6. **奖励模型、人工偏好和自动验证器都是真实目标的代理；优化代理时，模型会改变分布并暴露代理的漏洞。**
7. **后训练真正优化的不是“模型知道多少”，而是“面对一个具体条件时，模型选择哪一种行为以及愿意为它分配多少计算”。**

所以，最简洁而又足够精确的表述是：

> **后训练是在预训练形成的条件概率先验上，利用示范、偏好或环境反馈进行受约束的测度变换；它通过改变行为概率、潜在策略和计算分配，把“可表达的能力”转化为“在目标分布上稳定发生的行为”。**

这也解释了它的力量和边界：它可以显著改变模型的性格、接口、策略和推理习惯；它可以通过探索与验证增强某些技能；但它无法绕过信息、表示、奖励和分布覆盖本身的限制。

---

## 与前一版文档的关系

前一版回答了“后训练有哪些阶段、方法和工程失败模式”；本篇把这些方法压缩到一个数学框架中：

- InstructGPT、SFT、FLAN：对应示范分布的似然投影；
- RLHF、PPO：对应带 KL 参考策略的在线奖励优化；
- DPO：对应偏好诱导的隐式密度比学习；
- Constitutional AI、RLAIF：对应规则或 AI 评判器定义的代理奖励；
- DeepSeekMath、DeepSeek-R1：对应可验证终端奖励下的轨迹分布重加权；
- LIMA、Tülu 3：说明数据质量、任务覆盖和评测分布决定投影结果是否能泛化。

推荐先读统一变分问题（式 1–4），再读模式选择与模式内生成的分解（式 10–12）和奖励偏差被利用的机制（式 16）。这三处最能回答“后训练究竟改变了什么”。

## 参考文献

1. Christiano et al. (2017), *Deep Reinforcement Learning from Human Preferences*. https://arxiv.org/abs/1706.03741
2. Stiennon et al. (2020), *Learning to summarize from human feedback*. https://arxiv.org/abs/2009.01325
3. Ouyang et al. (2022), *Training language models to follow instructions with human feedback*. https://arxiv.org/abs/2203.02155
4. Chung et al. (2022), *Scaling Instruction-Finetuned Language Models*. https://arxiv.org/abs/2210.11416
5. Bai et al. (2022), *Constitutional AI: Harmlessness from AI Feedback*. https://arxiv.org/abs/2212.08073
6. Rafailov et al. (2023), *Direct Preference Optimization*. https://arxiv.org/abs/2305.18290
7. Zhou et al. (2023), *LIMA: Less Is More for Alignment*. https://arxiv.org/abs/2305.11206
8. Shao et al. (2024), *DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models*. https://arxiv.org/abs/2402.03300
9. Wang et al. (2024), *Reinforcement Learning for LLM Post-Training: A Survey*. https://arxiv.org/abs/2407.16216
10. Lambert et al. (2024), *Tülu 3: Pushing Frontiers in Open Language Model Post-Training*. https://arxiv.org/abs/2411.15124
11. DeepSeek-AI et al. (2025), *DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning*. https://arxiv.org/abs/2501.12948
12. Kumar et al. (2025), *LLM Post-Training: A Deep Dive into Reasoning Large Language Models*. https://arxiv.org/abs/2502.21321
13. Hassid, Adi & Schwartz (2026), *Post-training is (Massive) Supervised Learning*. https://arxiv.org/abs/2606.07527
