用一个回答微调模型以后，模型对其他回答的输出概率会怎样变化？
在 preference finetuning 中，chosen response 和 rejected response 各自的概率又会怎样变化？

我们希望知道，一次训练更新会提高哪些回答的概率、降低哪些回答的概率，以及这些变化的大小由什么决定。

### proposition 1, AKG 分解

先考虑只有一个输出位置的分类问题。令词表或类别集合为 $\mathcal{V}=\left\{1,\ldots,V\right\}$，其中 $V\geq 2$。模型参数为 $\theta\in\mathbb{R}^{d}$，$d$ 是参数个数；输入 $\boldsymbol{x}$ 的 logits 为 $\boldsymbol{z}\left(\boldsymbol{x}\right)=h_{\theta}\left(\boldsymbol{x}\right)\in\mathbb{R}^{V}$。这里 logits 是模型在 softmax 之前输出的未归一化数值，每个类别对应一个 logit。预测概率向量定义为

$$
\pi_{\theta}\left(\boldsymbol{x}\right)
=\operatorname{Softmax}\left(\boldsymbol{z}\left(\boldsymbol{x}\right)\right),
\qquad
\pi_{\theta}\left(i\mid\boldsymbol{x}\right)
=\frac{\exp\left(z_i\left(\boldsymbol{x}\right)\right)}
{\displaystyle\sum\limits_{j=1}^{V}\exp\left(z_j\left(\boldsymbol{x}\right)\right)}.
$$

这里 $i,j$ 是类别索引，$\log\pi_{\theta}\left(\boldsymbol{x}\right)$ 表示对概率向量逐分量取自然对数。

令 $\boldsymbol{x}_{u}$ 为用来更新参数的训练输入，$y_u$ 为它的监督标签。$\boldsymbol{x}_{o}$ 为我们观察的输入，下标 $u$ 和 $o$ 分别区分“更新对象”和“观察对象”；损失 $\mathcal{L}\left(\boldsymbol{x}_{u},y_u;\theta\right)$ 通过训练输入的 logits 依赖参数。第 $t$ 步采用学习率 $\eta>0$，执行一次普通梯度下降：

$$
\theta_{t+1}=\theta_t-\eta\nabla_{\theta}\mathcal{L}\left(\boldsymbol{x}_{u},y_u;\theta_t\right).
$$

为使余项有明确保证，我们假设观察输入的各个对数概率二阶连续可微，且 Hessian 的算子范数有统一上界；损失对训练 logits 的梯度也有界。这里算子范数定义为 $\left\|B\right\|_{\mathrm{op}}=\sup_{\left\|v\right\|_2=1}\left\|Bv\right\|_2$，向量的 $\left\|\cdot\right\|_2$ 是欧氏范数。这些条件保证足够小的一步参数变化可以由一阶展开描述。

记 logits 对参数的 Jacobian 为

$$
\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}\right)\right|_{\theta_t}
=\left.\frac{\partial\boldsymbol{z}\left(\boldsymbol{x}\right)}{\partial\theta}\right|_{\theta=\theta_t}
\in\mathbb{R}^{V\times d}.
$$

命题的内容是，一次更新造成的对数概率变化可以写成

$$
\begin{aligned}
\Delta\log\pi^{t}\left(\boldsymbol{x}_{o}\right)
&\triangleq\log\pi_{\theta_{t+1}}\left(\boldsymbol{x}_{o}\right)
-\log\pi_{\theta_t}\left(\boldsymbol{x}_{o}\right)\\
&=-\eta\mathcal{A}^{t}\left(\boldsymbol{x}_{o}\right)
\mathcal{K}^{t}\left(\boldsymbol{x}_{o},\boldsymbol{x}_{u}\right)
\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)
+O\left(\eta^2\left\|\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right\|_{\mathrm{op}}^2\right),
\end{aligned}
$$

这里三个因子分别为

$$
\begin{aligned}
\mathcal{A}^{t}\left(\boldsymbol{x}_{o}\right)
&=I-\boldsymbol{1}\pi_{\theta_t}\left(\boldsymbol{x}_{o}\right)^{\top}
\in\mathbb{R}^{V\times V},\\
\mathcal{K}^{t}\left(\boldsymbol{x}_{o},\boldsymbol{x}_{u}\right)
&=\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{o}\right)\right|_{\theta_t}\left(\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right)^{\top}
\in\mathbb{R}^{V\times V},\\
\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)
&=\left.\nabla_{\boldsymbol{z}}\mathcal{L}\left(\boldsymbol{x}_{u},y_u\right)\right|_{\boldsymbol{z}=\boldsymbol{z}^{t}\left(\boldsymbol{x}_{u}\right)}
\in\mathbb{R}^{V}.
\end{aligned}
$$

这里 $I$ 是 $V$ 阶单位矩阵，$\boldsymbol{1}$ 是长度为 $V$ 的全一列向量，所有标量函数的梯度均写成列向量。

> 这一分解给出了一次梯度下降对指定观察回答的影响，使我们能够逐项分析训练影响的来源：
>
> - 训练 loss 决定怎样推动训练输入的 logits；
> - 共享参数把这一作用传到观察输入的 logits；
> - softmax 再将 logits 的变化转化为概率变化。

**证明。** 思路是沿着“从 loss 对训练 logits 的梯度出发，通过链式法则得到参数更新，再计算这次更新对观察 logits 和观察概率的影响”这条路径连续使用链式法则。

先计算最后一环。记模型的输出概率分布 $\pi_{\theta_t}\left(\boldsymbol{x}_o\right)
=\operatorname{Softmax}\left(\boldsymbol{z}^{t}\left(\boldsymbol{x}_o\right)\right)$，并令 $\delta_{ij}$ 在 $i=j$ 时为 $1$、否则为 $0$。由
$$
\log \pi_{\theta_t}\left(i\mid\boldsymbol{x}_o\right)=z_i^t\left(\boldsymbol{x}_o\right)-\log\left(\sum\limits_{k=1}^{V}\exp(z_k^t\left(\boldsymbol{x}_o\right))\right)
$$

可得

$$
\frac{\partial\log \pi_{\theta_t}\left(i\mid\boldsymbol{x}_o\right)}{\partial z_j^t\left(\boldsymbol{x}_o\right)}=\delta_{ij}-\pi_{\theta_t}\left(j\mid\boldsymbol{x}_o\right)
$$

写成矩阵即有：
\[
\frac{\partial\log\pi_{\theta_t}(\boldsymbol{x}_o)}{\partial\boldsymbol{z}^{t}}
=I-\boldsymbol{1}\pi_{\theta_t}(\boldsymbol{x}_o)^{\top}=\mathcal{A}^{t}\left(\boldsymbol{x}_{o}\right)
\]
可见，$\mathcal{A}^{t}$ 是 log-softmax 的 Jacobian.

之后进一步分析参数变化。令 $\Delta\theta=\theta_{t+1}-\theta_t$，链式法则给出

$$
\Delta\theta=-\eta\nabla_{\theta}\mathcal{L}=-\eta\left(\frac{\partial\boldsymbol{z}}{\partial\theta}\right)^\top\frac{\partial\mathcal L}{\partial\boldsymbol{z}}=
-\eta \left(\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right)^{\top}\mathcal{G}^{t}.
$$

把观察输入 $\boldsymbol{x}_o$ 的对数概率在 $\theta_t$ 处泰勒展开：
$$
\begin{aligned}
\Delta\log\pi^{t}\left(\boldsymbol{x}_o\right) &= \left. \frac{\partial\log\pi_{\theta}\left(\boldsymbol{x}_o\right)}{\partial\theta}\right|_{\theta=\theta_t} \Delta\theta+\frac{1}{2} \begin{pmatrix} \Delta\theta^{\top} \left.\nabla_{\theta}^{2}\log\pi_{\theta}\left(1\mid\boldsymbol{x}_o\right)\right|_{\theta=\theta_t+\xi_1\Delta\theta} \Delta\theta\\ \vdots\\ \Delta\theta^{\top} \left.\nabla_{\theta}^{2}\log\pi_{\theta}\left(V\mid\boldsymbol{x}_o\right)\right|_{\theta=\theta_t+\xi_V\Delta\theta} \Delta\theta \end{pmatrix}
\end{aligned}
$$
这里 $\xi_i\in[0,1],1\le i\le V$ 是泰勒展开余项的中间位置参数。

由假设，观察输入 $\boldsymbol{x}_o$ 的各个对数概率的 Hessian 有统一算子范数上界；将其记作 $H$，则余项每个分量的绝对值
\[
\begin{aligned} 
\frac{1}{2}\left|\Delta\theta^{\top}\left.\nabla_{\theta}^{2}\log\pi_{\theta}\left(i\mid\boldsymbol{x}_o\right)\right|_{\theta=\theta_t+\xi_i\Delta\theta}\Delta\theta\right|
&\leq\frac{1}{2}\left\|\Delta\theta\right\|_2 \left\|\left.\nabla_{\theta}^{2}\log\pi_{\theta}\left(i\mid\boldsymbol{x}_o\right)\right|_{\theta=\theta_t+\xi_i\Delta\theta}\Delta\theta\right\|_2\\ 
&\leq\frac{1}{2}\left\|\Delta\theta\right\|_2 \left\|\left.\nabla_{\theta}^{2}\log\pi_{\theta}\left(i\mid\boldsymbol{x}_o\right)\right|_{\theta=\theta_t+\xi_i\Delta\theta}\right\|_{\mathrm{op}} \left\|\Delta\theta\right\|_2\\ &\leq\frac{H}{2}\left\|\Delta\theta\right\|_2^2. \end{aligned}
\]
从而整个余项向量的欧氏范数至多为 $\frac{\sqrt{V}H}{2}\left\|\Delta\theta\right\|_2^2$. 我们将其记为 $O\left(\left\|\Delta\theta\right\|_2^2\right)$，代表范数上界被常数倍的 $\left\|\Delta\theta\right\|_2^2$ 控制的余项向量。
我们有：
$$
\begin{aligned}
\Delta\log\pi^{t}\left(\boldsymbol{x}_o\right)
&= \left.\frac{\partial\log\pi_{\theta}\left(\boldsymbol{x}_o\right)}{\partial\theta} \right|_{\theta=\theta_t} \Delta\theta+O\left(\left\|\Delta\theta\right\|_2^2\right)\\
&=\left.\frac{\partial\log\pi_{\theta}(\boldsymbol{x}_o)}{\partial\boldsymbol{z}}\frac{\partial\boldsymbol{z}}{\partial\theta}\right|_{\theta=\theta_t}\left(-\eta \left(\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right)^{\top}\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)\right)
+O\left(\left\|\Delta\theta\right\|_2^2\right)\\
&=-\eta\mathcal{A}^{t}\left(\boldsymbol{x}_{o}\right)\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_o\right)\right|_{\theta_t}\left(\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right)^{\top}\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)+O\left(\left\|\Delta\theta\right\|_2^2\right)\\
&=-\eta\mathcal{A}^{t}\left(\boldsymbol{x}_{o}\right)\mathcal{K}^{t}\left(\boldsymbol{x}_{o},\boldsymbol{x}_{u}\right)\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)+O\left(\left\|\Delta\theta\right\|_2^2\right)
\end{aligned}
$$
由假设，损失对训练 logits 的梯度也有界。记 $\left\|\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)\right\|_2\leq C_G$，则
$$
\begin{aligned}
\left\|\Delta\theta\right\|_2^2
&=\|-\eta \left(\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right)^{\top}\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)\|_2^2\\
&\leq\eta^2\left\|\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right\|_{\mathrm{op}}^2
\left\|\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)\right\|_2^2\\
&\leq\eta^2 C_G^2\left\|\left.\nabla_{\theta}\boldsymbol{z}\left(\boldsymbol{x}_{u}\right)\right|_{\theta_t}\right\|_{\mathrm{op}}^2.
\end{aligned}
$$

代回即得命题。$\square$

分解中连接训练输入与观察输入的因子 $\mathcal{K}^{t}$ 称为 empirical neural tangent kernel (eNTK)，名称中的 tangent 指当前参数附近的一阶线性化，empirical 指在当前有限网络上直接计算这些梯度。它是两个 logits Jacobian 的乘积，每个元素都是一对 logit 参数梯度的内积：

$$
\left[\mathcal{K}^{t}\left(\boldsymbol{x}_{o},\boldsymbol{x}_{u}\right)\right]_{ij}
=\left\langle\nabla_{\theta}z_i\left(\boldsymbol{x}_{o}\right),
\nabla_{\theta}z_j\left(\boldsymbol{x}_{u}\right)\right\rangle_{\theta=\theta_t}.
$$

因此，沿着增大训练输入第 $j$ 个 logit 的梯度方向更新参数时，观察输入第 $i$ 个 logit 的一阶变化由这个内积决定：内积为正时增大，为负时减小，为零时没有一阶变化。$\mathcal K^t(\boldsymbol{x}_o,\boldsymbol{x}_u)$ 给出了**对训练输出的 logit 进行的梯度更新如何影响观察输入的 logit**.

实际更新同时涉及训练输入的所有 logits，**各个方向的权重由 loss 梯度 $\mathcal{G}^{t}$ 给出**。因此，$-\eta\mathcal{K}^{t}\left(\boldsymbol{x}_{o},\boldsymbol{x}_{u}\right)\mathcal{G}^{t}\left(\boldsymbol{x}_{u},y_u\right)$ 给出观察 logits 变化的一阶近似。接着，$\mathcal{A}^{t}$ **把观察输入的 logits 变化，换算成它的 log probabilities 变化**。具体地，将观察输入的 logits 的微小增量记为 $\boldsymbol{v}\in\mathbb{R}^{V}$，则

$$
\left[\mathcal{A}^{t}\left(\boldsymbol{x}_{o}\right)\boldsymbol{v}\right]_i
=v_i-\sum\limits_{j=1}^{V}\pi_{\theta_t}\left(j\mid\boldsymbol{x}_{o}\right)v_j.
$$

这里 $v_i$ 是第 $i$ 个 logit 的增量，而减去的加权平均增量来自 softmax 分母的对数的一阶变化：所有 logits 的变化都会影响分母，当前概率越大的类别，对这一变化的贡献权重越大。因此，在一阶近似下，第 $i$ 个类别的概率增加，需要自己的 logit 增量 $v_i$ 超过这个加权平均值；即使 $v_i>0$，只要它小于这个平均值，该类别的概率仍会下降。

总的来说，根据 AKG 分解，要判断某个观察类别的概率怎样变化，我们需要依次看 loss 提供的方向 (G)、eNTK 对这些方向的传递 (K)，以及归一化后的结果 (A)。

### 应用到 SFT 的结论

一个回答由多个 token 构成，而它们通过同一组参数相互影响。因此，将 proposition 1 应用到 SFT 时，我们需要追踪每个训练位置对每个观察位置的贡献，再把这些贡献相加。

令 $\boldsymbol{x}$ 表示 prompt，$\boldsymbol{y}=\left(y_1,\ldots,y_L\right)\in\mathcal{V}^{L}$ 表示长度为 $L$ 的回答。autoregressive language model 的回答概率为
$$
\pi_{\theta}\left(\boldsymbol{y}\mid\boldsymbol{x}\right)
=\prod\limits_{l=1}^{L}\pi_{\theta}\left(y_l\mid\boldsymbol{x},\boldsymbol{y}_{<l}\right),
\qquad
\boldsymbol{y}_{<l}=\left(y_1,\ldots,y_{l-1}\right).
$$

训练时使用 teacher forcing，即预测第 $l$ 个 token 时，输入给模型的是训练回答中已经给定的 prefix $\boldsymbol{y}_{<l}$。

令 $\chi=\left[\boldsymbol{x};\boldsymbol{y}\right]$ 表示 prompt 与回答的拼接，用 $h_{\theta}\left(\chi\right)\in\mathbb{R}^{V\times L}$ 同时记录所有回答位置的 logits，第 $l$ 列 $\boldsymbol{z}_{l}\left(\chi\right)$ 只依赖 $\boldsymbol{x}$ 和 $\boldsymbol{y}_{<l}$。记

$$
\left[\pi_{\theta}\left(\boldsymbol{y}\mid\chi\right)\right]_{l}
=\operatorname{Softmax}\left(\boldsymbol{z}_{l}\left(\chi\right)\right)
=\left[\pi_{\theta}\left(i\mid\boldsymbol{x},\boldsymbol{y}_{<l}\right)\right]_{i=1}^{V}.
$$

为位置 $l$ 处所有 token 的概率向量。

设训练回答 $\boldsymbol{y}_{u}^{+}$ 长度为 $L$，观察回答 $\boldsymbol{y}_{o}$ 长度为 $M$，相应拼接输入为 $\chi_u$ 和 $\chi_o$。SFT 最小化

$$
\mathcal{L}_{\mathrm{SFT}}\left(\chi_u\right)
=-\sum\limits_{l=1}^{L}\log\pi_{\theta}\left(y_l^{+}\mid\boldsymbol{x}_{u},\boldsymbol{y}_{<l}^{+}\right).
$$

对每个位置定义

$$
\begin{aligned}
\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}&=I-\boldsymbol{1}\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}^{\top},\\
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u\right)\right]_{m,l}&=\left.\nabla_{\theta}\boldsymbol{z}_{m}\left(\chi_o\right)\right|_{\theta_t}\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}\\
\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}
&=\left.\nabla_{\boldsymbol{z}_l}\mathcal{L}_{\mathrm{SFT}}\left(\chi_u\right)\right|_{\theta_t}
.
\end{aligned}
$$

这里 $m\in\left\{1,\ldots,M\right\}$ 是观察位置，$l\in\left\{1,\ldots,L\right\}$ 是训练位置。eNTK 的每个 block $\left[\mathcal{K}^{t}\right]_{m,l}$ 都是 $V\times V$ 矩阵，组合各个位置，所有块合起来就会得到 $V\times V\times M\times L$ 的 eNTK tensor。

**SFT 的分解结论。** 假设观察样本在位置 $m$ 的各个 token 对数概率关于参数二阶连续可微，且其 Hessian 的算子范数有统一上界；同时，参与本次更新的各个 $\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}$ 有界。则观察位置 $m$ 的对数预测概率变化为
$$
\left[\Delta\log\pi^{t}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}
=-\eta\sum\limits_{l=1}^{L}\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u\right)\right]_{m,l}
\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}+O\left(\eta^2\right),
$$

这里余项 $O(\eta^2)$ 中的常数允许依赖固定的序列长度。

**推导。** 对位置 $l$，记 SFT 的目标 token 为 $k$，则
$$
\begin{aligned}
\left[\mathcal{L}_{\mathrm{SFT}}\left(\chi_u\right)\right]_{l}
&=-\left[\boldsymbol{z}_l\right]_{k}+\log\left(\sum\limits_{j=1}^{V}e^{\left[\boldsymbol{z}_l\right]_{j}}\right),\\
\left.\frac{\partial\left[\mathcal{L}_{\mathrm{SFT}}\left(\chi_u\right)\right]_{l}}{\partial \left[\boldsymbol{z}_l\right]_{i}}\right|_{\theta=\theta_t}
&=-\delta_{ik}+\left.\frac{e^{\left[\boldsymbol{z}_l\right]_{i}}}{\displaystyle\sum\limits_{j=1}^{V}e^{\left[\boldsymbol{z}_l\right]_{j}}}\right|_{\theta=\theta_t}
=\left[\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}\right]_{i}-\delta_{ik}.
\end{aligned}
$$

把最后的结果写成向量可得 residual，它是预测分布与监督分布之差：
\[
\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_l=\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}-\boldsymbol{e}_{k}
\tag{1}
\]
这里 $\boldsymbol{e}_k\in\mathbb{R}^{V}$ 是第 $k$ 个分量为 $1$、其余分量为 $0$ 的 one-hot 标签。这一 residual 的范数有界：
$$
\begin{aligned}
\left\|\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}-\boldsymbol{e}_{k}\right\|_2^2
&=\left(1-\left[\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}\right]_{k}\right)^2+\sum\limits_{i\ne k}\left[\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}\right]_{i}^{2}\\
&\leq\left(1-\left[\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}\right]_{k}\right)^2+\left(\sum\limits_{i\ne k}\left[\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}\right]_{i}\right)^2\\
&=2\left(1-\left[\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u\right)\right]_{l}\right]_{k}\right)^2\\
&\leq2.
\end{aligned}
$$

SFT 的参数更新是所有位置的参数梯度相加：
$$
\begin{aligned}
\Delta\theta
&=-\eta\sum\limits_{l=1}^{L}\left(\left.\frac{\partial\boldsymbol{z}_l}{\partial\theta}\right|_{\theta=\theta_t}\right)^\top\left.\frac{\partial\left[\mathcal{L}_{\mathrm{SFT}}\left(\chi_u\right)\right]_{l}}{\partial\boldsymbol{z}_l}\right|_{\theta=\theta_t}\\
&=-\eta\sum\limits_{l=1}^{L}\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}
\end{aligned}
$$
类似 proposition 1 的方法，可得
$$
\begin{aligned}
\left[\Delta\log\pi^{t}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}
&=\left.\frac{\partial\left[\log\pi_{\theta}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}}{\partial\theta}\right|_{\theta=\theta_t}\Delta\theta+O\left(\left\|\Delta\theta\right\|_2^2\right)\\
&=\left.\frac{\partial\left[\log\pi_{\theta}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}}{\partial\boldsymbol{z}_{m}\left(\chi_o\right)}
\frac{\partial\boldsymbol{z}_{m}\left(\chi_o\right)}{\partial\theta}\right|_{\theta=\theta_t}
\left(-\eta\sum\limits_{l=1}^{L}
\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}
\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}\right)
+O\left(\left\|\Delta\theta\right\|_2^2\right)\\
&=-\eta\sum\limits_{l=1}^{L}
\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}
\left.\nabla_{\theta}\boldsymbol{z}_{m}\left(\chi_o\right)\right|_{\theta_t}
\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}
\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}
+O\left(\left\|\Delta\theta\right\|_2^2\right)\\
&=-\eta\sum\limits_{l=1}^{L}\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u\right)\right]_{m,l}\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}+O\left(\left\|\Delta\theta\right\|_2^2\right).
\end{aligned}
$$

结合前面对 $\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}$ 给出的上界，类似地处理 $O\left(\left\|\Delta\theta\right\|_2^2\right)$：
$$
\begin{aligned}
\left\|\Delta\theta\right\|_2^2
&=\left\|-\eta\sum\limits_{l=1}^{L}\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}\right\|^2\\
&\le\eta^2\left(\sum\limits_{l=1}^{L}\left\|\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}\right\|\right)^2\\
&=\eta^2\left(\sum\limits_{l=1}^{L}1\cdot\left\|\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}\right\|\right)^2\\
&\le\eta^2\left(\sum\limits_{l=1}^{L}1^2\right)
\left(\sum\limits_{l=1}^{L}\left\|\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}\right\|^2\right)\\
&=\eta^2L\sum\limits_{l=1}^{L}\left\|\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right)^{\top}\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}\right\|^2\\
&\le\eta^2L\sum\limits_{l=1}^{L}\left\|\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right\|_{\mathrm{op}}^2
\left\|\left[\mathcal{G}_{\mathrm{SFT}}^{t}\left(\chi_u\right)\right]_{l}\right\|^2\\
&\le2\eta^2L\sum\limits_{l=1}^{L}\left\|\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u\right)\right|_{\theta_t}\right\|_{\mathrm{op}}^2
\end{aligned}
$$
从而 $O\left(\left\|\Delta\theta\right\|_2^2\right)$ 变为 $O\left(\eta^2\right)$，且常数依赖固定的序列长度 $L$. $\square$

现在固定观察回答的一个位置 $m$。训练位置 $l$ 的 residual 表示当前预测与目标 token 的差异，它经由 $\left[\mathcal{K}^{t}\left(\chi_o,\chi_u\right)\right]_{m,l}$ 影响观察位置的 logits，再由 $\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}$ 转化为对数概率变化。对所有训练位置求和，就得到该位置受到的总影响；不同位置的贡献可能同向，也可能抵消。

要得到完整观察回答 $\boldsymbol{y}_o$ 的对数概率变化，我们在每个位置 $m$ 取出实际 token $y_{o,m}$ 对应的分量，再对所有观察位置求和。这便把“学习一个回答以后，另一个回答的概率怎样变化”转化为可以计算的各位置贡献。

### 应用到 DPO 的结论

SFT 的 loss 依赖一个训练回答。DPO 的 loss 同时依赖同一个 prompt 下的 chosen response 和 rejected response，因此我们先把 AKG 分解扩展到两条分支，再计算 DPO 在每条分支上产生的梯度。

给定偏好样本 $\left(\boldsymbol{x}_u,\boldsymbol{y}_u^{+},\boldsymbol{y}_u^{-}\right)$，其中 $+$ 对应 chosen response，$-$ 对应 rejected response。两条回答的长度分别为 $L_{+}$ 和 $L_{-}$，拼接输入为 $\chi_u^{\pm}=\left[\boldsymbol{x}_u;\boldsymbol{y}_u^{\pm}\right]$. 固定 reference model $\pi_{\mathrm{ref}}$，取超参数 $\beta>0$，DPO 的单样本 loss 为

$$
\mathcal{L}_{\mathrm{DPO}}\left(\theta\right)
=-\log\sigma\left(
\beta\log\frac{\pi_{\theta}\left(\boldsymbol{y}_u^{+}\mid\chi_u^{+}\right)}
{\pi_{\mathrm{ref}}\left(\boldsymbol{y}_u^{+}\mid\chi_u^{+}\right)}
-\beta\log\frac{\pi_{\theta}\left(\boldsymbol{y}_u^{-}\mid\chi_u^{-}\right)}
{\pi_{\mathrm{ref}}\left(\boldsymbol{y}_u^{-}\mid\chi_u^{-}\right)}
\right),
\qquad
\sigma\left(b\right)=\frac{1}{1+e^{-b}}.
$$

这里两个 $\pi_{\theta}$ 都是完整回答的标量概率，使用 teacher forcing 计算，与前面逐位置概率向量的关系为

$$
\pi_{\theta}\left(\boldsymbol{y}_u^{\pm}\mid\chi_u^{\pm}\right)
=\prod\limits_{l=1}^{L_{\pm}}
\left[
\left[\pi_{\theta}\left(\boldsymbol{y}\mid\chi_u^{\pm}\right)\right]_{l}
\right]_{y_l^{\pm}}.
$$

这里内层下标 $l$ 选出位置 $l$ 的概率向量，外层下标 $y_l^{\pm}$ 再取出该位置实际 token 的概率；reference model 的回答概率也按同样方式计算。

两条回答具有各自的 prefix，因此 loss 依赖两组 logits $\boldsymbol{z}^{\pm}=h_{\theta}\left(\chi_u^{\pm}\right)\in\mathbb{R}^{V\times L_{\pm}}$；其第 $l$ 列记为 $\boldsymbol{z}_l^{\pm}=\boldsymbol{z}_l\left(\chi_u^{\pm}\right)$. 

仍令 $\chi_o=\left[\boldsymbol{x}_o;\boldsymbol{y}_o\right]$ 为观察样本，$M$ 为观察回答的长度，$m\in\left\{1,\ldots,M\right\}$ 为观察位置。沿用 SFT 中的定义，

$$
\begin{aligned}
\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}
&=I-\boldsymbol{1}\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}^{\top},\\
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u^{\pm}\right)\right]_{m,l}
&=\left.\nabla_{\theta}\boldsymbol{z}_{m}\left(\chi_o\right)\right|_{\theta_t}
\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u^{\pm}\right)\right|_{\theta_t}\right)^{\top}.
\end{aligned}
$$

这里两条分支的 $l$ 分别取遍 $\left\{1,\ldots,L_{+}\right\}$ 和 $\left\{1,\ldots,L_{-}\right\}$. 我们用 loss 对 logits 的梯度定义两个因子：

$$
\begin{aligned}
\left[\mathcal{G}_{\mathrm{DPO+}}^{t}\right]_{l}
&=\left.\nabla_{\boldsymbol{z}_l^{+}}\mathcal{L}_{\mathrm{DPO}}\right|_{\theta_t},\\
\left[\mathcal{G}_{\mathrm{DPO-}}^{t}\right]_{l}
&=-\left.\nabla_{\boldsymbol{z}_l^{-}}\mathcal{L}_{\mathrm{DPO}}\right|_{\theta_t}.
\end{aligned}
$$

接下来先保留这两个梯度因子，得到两分支的分解结构，再展开它们的具体表达式。

**DPO 的分解结论。** 假设观察位置 $m$ 的各个 token 对数概率关于参数二阶连续可微，且其 Hessian 的算子范数在当前参数的邻域内有统一上界；两条训练分支的 logits Jacobian 有界，$\beta$ 和序列长度固定。则一次梯度下降造成的变化为
$$
\begin{aligned}
\left[\Delta\log\pi^{t}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}
=-\eta\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}
\Bigg[&
\sum\limits_{l=1}^{L_{+}}
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u^{+}\right)\right]_{m,l}
\left[\mathcal{G}_{\mathrm{DPO+}}^{t}\right]_{l}\\
&-\sum\limits_{l=1}^{L_{-}}
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u^{-}\right)\right]_{m,l}
\left[\mathcal{G}_{\mathrm{DPO-}}^{t}\right]_{l}
\Bigg]+O\left(\eta^2\right).
\end{aligned}
$$

**证明。** 对两组 logits 分别使用链式法则，参数更新为
$$
\begin{aligned}
\Delta\theta
&=-\eta\nabla_{\theta}\mathcal{L}_{\mathrm{DPO}}\left(\theta_t\right)\\
&=-\eta\Bigg[
\sum\limits_{l=1}^{L_{+}}
\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u^{+}\right)\right|_{\theta_t}\right)^{\top}
\left[\mathcal{G}_{\mathrm{DPO+}}^{t}\right]_{l}-
\sum\limits_{l=1}^{L_{-}}
\left(\left.\nabla_{\theta}\boldsymbol{z}_{l}\left(\chi_u^{-}\right)\right|_{\theta_t}\right)^{\top}
\left[\mathcal{G}_{\mathrm{DPO-}}^{t}\right]_{l}
\Bigg].
\end{aligned}
$$

观察样本的 Taylor 展开与 SFT 相同，将这次参数更新代入，得到

$$
\begin{aligned}
\left[\Delta\log\pi^{t}\left(\boldsymbol{y}\mid\chi_o\right)\right]_{m}
&=\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}
\left.\nabla_{\theta}\boldsymbol{z}_{m}\left(\chi_o\right)\right|_{\theta_t}
\Delta\theta
+O\left(\left\|\Delta\theta\right\|_2^2\right)\\
&=-\eta\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_{m}
\Bigg[
\sum\limits_{l=1}^{L_{+}}
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u^{+}\right)\right]_{m,l}
\left[\mathcal{G}_{\mathrm{DPO+}}^{t}\right]_{l}\\
&\hspace{8em}-
\sum\limits_{l=1}^{L_{-}}
\left[\mathcal{K}^{t}\left(\chi_o,\chi_u^{-}\right)\right]_{m,l}
\left[\mathcal{G}_{\mathrm{DPO-}}^{t}\right]_{l}
\Bigg]
+O\left(\left\|\Delta\theta\right\|_2^2\right).
\end{aligned}
$$

这就得到了两分支的 AKG 结构。

现在计算其中的 $\mathcal{G}_{\mathrm{DPO+}}^{t}$ 和 $\mathcal{G}_{\mathrm{DPO-}}^{t}$. 按照 loss 的复合关系，定义
$$
\begin{aligned}
\mathcal{L}_{\mathrm{DPO}}&=-\log a,\\
a&=\sigma\left(b\right),\\
b&=\beta\left(
\log\pi_{\theta}\left(\boldsymbol{y}_u^{+}\mid\chi_u^{+}\right)
-\log\pi_{\theta}\left(\boldsymbol{y}_u^{-}\mid\chi_u^{-}\right)
\right)-c\\
&=-\beta\left(
\mathcal{L}_{\mathrm{SFT}}\left(\chi_u^{+}\right)
-\mathcal{L}_{\mathrm{SFT}}\left(\chi_u^{-}\right)
\right)-c,\\
c&=\beta\left(
\log\pi_{\mathrm{ref}}\left(\boldsymbol{y}_u^{+}\mid\chi_u^{+}\right)
-\log\pi_{\mathrm{ref}}\left(\boldsymbol{y}_u^{-}\mid\chi_u^{-}\right)
\right).
\end{aligned}
$$

这里 $\mathcal{L}_{\mathrm{SFT}}\left(\chi_u^{+}\right)$ 和 $\mathcal{L}_{\mathrm{SFT}}\left(\chi_u^{-}\right)$ 分别是以两条回答为目标的 cross-entropy，$c$ 与参数 $\theta$ 无关；$b$ 是相对 reference model 的 preference margin 乘以 $\beta$ 后的值。以下导数都在当前参数 $\theta_t$ 处计算，$a$ 也取该处的值。

如式 (1)，SFT 中已经算出，每个位置的 cross-entropy 对 logits 的梯度是预测分布减去 one-hot 标签。因此，

$$
\begin{aligned}
\left.\nabla_{\boldsymbol{z}_l^{+}}b\right|_{\theta_t}
&=-\beta\left.\nabla_{\boldsymbol{z}_l^{+}}
\mathcal{L}_{\mathrm{SFT}}\left(\chi_u^{+}\right)\right|_{\theta_t}\\
&=-\beta\left(
\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u^{+}\right)\right]_{l}
-\boldsymbol{e}_{y_l^{+}}
\right),\\
\left.\nabla_{\boldsymbol{z}_l^{-}}b\right|_{\theta_t}
&=\beta\left.\nabla_{\boldsymbol{z}_l^{-}}
\mathcal{L}_{\mathrm{SFT}}\left(\chi_u^{-}\right)\right|_{\theta_t}\\
&=\beta\left(
\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u^{-}\right)\right]_{l}
-\boldsymbol{e}_{y_l^{-}}
\right).
\end{aligned}
$$

再沿着 $b\mapsto a\mapsto\mathcal{L}_{\mathrm{DPO}}$ 使用链式法则：

$$
\left.\frac{\partial\mathcal{L}_{\mathrm{DPO}}}{\partial b}\right|_{\theta_t}
=\left.\frac{\partial\mathcal{L}_{\mathrm{DPO}}}{\partial a}
\frac{\partial a}{\partial b}\right|_{\theta_t}
=-\frac{1}{a}a\left(1-a\right)
=-\left(1-a\right).
$$

于是，两个梯度因子的具体表达式为

$$
\begin{aligned}
\left[\mathcal{G}_{\mathrm{DPO+}}^{t}\right]_{l}
&=-\left(1-a\right)\left.\nabla_{\boldsymbol{z}_l^{+}}b\right|_{\theta_t}\\
&=\beta\left(1-a\right)\left(
\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u^{+}\right)\right]_{l}
-\boldsymbol{e}_{y_l^{+}}
\right),\\
\left[\mathcal{G}_{\mathrm{DPO-}}^{t}\right]_{l}
&=\left(1-a\right)\left.\nabla_{\boldsymbol{z}_l^{-}}b\right|_{\theta_t}\\
&=\beta\left(1-a\right)\left(
\left[\pi_{\theta_t}\left(\boldsymbol{y}\mid\chi_u^{-}\right)\right]_{l}
-\boldsymbol{e}_{y_l^{-}}
\right).
\end{aligned}
$$

可见，这两个因子都是各自的 cross-entropy residual 乘以 $\beta\left(1-a\right)$. 由 SFT 中的范数估计以及 $0<a<1$，每个因子的欧氏范数至多为 $\sqrt{2}\beta$. 因而在 logits Jacobian 有界、序列长度固定时，上面的参数更新满足 $\left\|\Delta\theta\right\|_2=O\left(\eta\right)$，余项相应变为 $O\left(\eta^2\right)$，即得结论。$\square$

由此可见 DPO 与 SFT 的直接联系：chosen 分支沿着对应 SFT 的更新方向作用，rejected 分支沿着对应 SFT 的反方向作用，两者共同乘以 $\beta\left(1-a\right)$. 注意 $a$ 来自完整回答的概率比，由该偏好样本的所有位置共享，并不是逐 token 计算的。

对固定的 $\beta$，相对 reference model 的 preference margin 越大，$b$ 越大，$a=\sigma\left(b\right)$ 越接近 $1$，共同系数 $\beta\left(1-a\right)$ 就越小。因此，模型已经区分得较好的偏好样本，其梯度会受到更强的衰减。

对一个指定的观察回答，两条分支各自通过 $\left[\mathcal{K}^{t}\left(\chi_o,\chi_u^{+}\right)\right]_{m,l}$ 和 $\left[\mathcal{K}^{t}\left(\chi_o,\chi_u^{-}\right)\right]_{m,l}$ 传递影响，再由同一个 $\left[\mathcal{A}^{t}\left(\chi_o\right)\right]_m$ 转成 log probabilities 的变化。两条分支对某个观察 token 的贡献可能相互增强，也可能抵消。

这也给出了分析 chosen response 自身概率变化的方法：令 $\chi_o=\chi_u^{+}$，取出各位置实际 token 的分量并求和，分别计算两条分支对完整回答的贡献。chosen 分支提供对应 SFT 的提升作用，而 rejected 分支也可能通过共享参数降低 chosen response 的概率；若后者超过前者，一阶总变化就为负。再令 $\chi_o=\chi_u^{-}$，便能同样分析 rejected response 的变化。
