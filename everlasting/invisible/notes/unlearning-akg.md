# unlearning 视角下的 AKG 分解

> 取自 https://arxiv.org/abs/2510.19422

[TOC]

---

# 命题 List

## 引理 1

设 $\mathcal X_u=[\mathbf x_u;\mathbf y_u]$ 是一个遗忘样本对，$\mathcal X_o=[\mathbf x_u;\mathbf y_o]$ 是使用任意候选回答构成的相同提示。 在 teacher forcing：

> 计算 $\mathbf y_{o,l}$ 概率分布的时候，前面的回答都采用 $\mathbf y_{o,<l}$ 而不是模型自己生成的回复。后面的 $\mathbf y_o\mid\mathcal X_o$ 就表示这一 teacher forcing 的概率

下，学习率为 $\eta$ 的一次 SGD 更新会使 $\mathbf y_o$ 的对数概率发生如下变化：

$$
\Delta \log \pi_t(\mathbf y_o\mid\mathcal X_o)
= -\eta\,\mathcal A_t(\mathcal X_o)\,\mathcal K_t(\mathcal X_o,\mathcal X_u)\,\mathcal G_t(\mathcal X_u)+O(\eta^2),
$$

其中 $\mathcal A_t(\mathcal X_o)$ 是 log-softmax 对输入的 logits $z\in\mathbb R^{V\times L}$ 的雅可比矩阵；第二项

$$
\mathcal K_t(\mathcal X_o,\mathcal X_u)
=\nabla_\theta z(\mathcal X_o)\,\nabla_\theta z(\mathcal X_u)^\top
$$

是 eNTK，衡量两个输入的网络输出有多依赖于相似的参数方向，也就是在一个样本上更新参数，会在多大程度上影响另一个样本的输出；第三项

$$
\mathcal G_t(\mathcal X_u)=\nabla_z\mathcal L(\mathcal X_u)
$$

刻画了完全由遗忘损失引入的残差项。所有量均在 $\theta^t$ 处求值。

> 把对数预测概率的变化进行 AKG 分解。参见https://arxiv.org/abs/2407.10490

## 定理 2

梯度上升（GA）是一种 unlearning 方法，在 $\mathcal X_u$ 上最大化每个位置 $i$ 的负对数似然，也即模型输出分布与 $\mathcal X_u$ 分布 $\mathbf e_{y_u^i}$ 的交叉熵；

Bootstrapping-Token（BS-T）方法则最大化模型分布与

$$
(1-\lambda)\mathbf e_{y_u^i}+\lambda\mathbf q^i
$$

的交叉熵，其中

$$
\mathbf q^i \triangleq \operatorname{sg}\!\left[
\left.\pi_{\theta^t}(\cdot\mid \mathcal X_u)\right|_{\mathcal H_{k}^i}
\right],
$$

是模型的输出分布中最高似然的 Top-$k$ 个词重归一化后的概率分布，$\lambda$ 是平衡原分布和重归一化分布的超参数。

沿用引理 1 中的记号 $\mathcal G(\mathcal X_u)=\nabla_z\mathcal L(\mathcal X_u)$，则在位置 $i$ 处，GA 和 BS-T 的残差项 $\mathcal G$ 分别为：

$$
\mathcal G_{\mathrm{GA}}^i
=
\pi_{\theta^t}(\cdot\mid \mathcal X_u)-\mathbf e_{y_u^i};
$$

和

$$
\mathcal G_{\mathrm{BST}}^i
=
\pi_{\theta^t}(\cdot\mid \mathcal X_u)
-
\bigl((1-\lambda)\mathbf e_{y_u^i}+\lambda\mathbf q^i\bigr).
$$

因此，对于任意分量 $v\ne y_u^i$，有

$$
\mathcal G_{\mathrm{BST}}^i[v]
=
\mathcal G_{\mathrm{GA}}^i[v]
+
\lambda \mathbf q^i[v].
$$

> 给出 BS-T 和朴素梯度上升方法的 $\nabla_z\mathcal L(\mathcal X_u)$ 关系式，体现 BS-T 方法额外抑制与 $\mathcal X_u$ 中 $\mathbf y_u^i$ 近邻的语义相似的 token $\mathbf q_i$.

# 命题证明 List

## 引理 1 的证明

我们考察在单个遗忘样本 $\mathcal X_u=[\mathbf x_u;\mathbf y_u]$ 上，从时刻 $t$ 到 $t+1$ 的一次 SGD 更新，学习率为 $\eta$。令

$$
z(\mathcal X)\in\mathbb R^{V\times L}
$$

表示 token-logit 矩阵（序列长度为 $L$），并令 $\pi_\theta(\cdot\mid\mathcal X)\in\mathbb R^{V\times L}$ 表示教师强制下的条件分布。

对损失 $\mathcal L(\mathcal X_u)$ 执行一次梯度更新可得

$$
\theta^{t+1}=\theta^t-\eta\nabla_\theta\mathcal L(\mathcal X_u).
$$

在 $\theta^t$ 处展开 $z(\mathcal X_o)$ 的变化

$$
\begin{aligned}
\Delta z(\mathcal X_o)
&\triangleq z(\mathcal X_o;\theta^{t+1})-z(\mathcal X_o;\theta^t)\\
&=\nabla_\theta z(\mathcal X_o)(\theta^{t+1}-\theta^t)+O(\|\theta^{t+1}-\theta^t\|^2_2)\\
&=-\eta\,\nabla_\theta z(\mathcal X_o)\,\nabla_\theta\mathcal L(\mathcal X_u)+O(\eta^2)\\
&=-\eta\,\nabla_\theta z(\mathcal X_o)\,\nabla_\theta z(\mathcal X_u)^\top\,\nabla_z\mathcal L(\mathcal X_u)+O(\eta^2)\\
&=-\eta\,\mathcal K_t(\mathcal X_o,\mathcal X_u)\,\mathcal G_t(\mathcal X_u)+O(\eta^2).
\end{aligned}
\tag{1}
$$

这里定义了经验 NTK（针对 logit 网络）

$$
\mathcal K_t(\mathcal X_o,\mathcal X_u)
=\nabla_\theta z(\mathcal X_o)\nabla_\theta z(\mathcal X_u)^\top
$$

以及残差项

$$
\mathcal G_t(\mathcal X_u)=\nabla_z\mathcal L(\mathcal X_u)。
$$

$\Delta z(\mathcal X_o)$ 处理完了，但我们要的是 $\Delta\log\pi^t(\cdot\mid\mathcal X_o)$，因此接下来考虑 $\mathcal A_t(\mathcal X_o)\triangleq\nabla_z\log\pi_t^\theta(\cdot\mid\mathcal X_o)$. 记

$$
z(\mathcal X_o)\in\mathbb R^{V\times L},
\qquad
\pi_\theta(\cdot\mid\mathcal X_o)\in\mathbb R^{V\times L}.
$$

的第 $l$ 列分别是

$$
z_l\in\mathbb R^V,\qquad \pi_l=\operatorname{softmax}(z_l)\in\mathbb R^V.
$$

log-softmax 是逐列作用的，因此 $\log\pi$ 相对于 logits 第 $l$ 个位置的雅可比为

$$
\mathcal A_l=
\left(\frac{\partial\log{\pi_l}_i}{\partial {z_l}_j}\right)_{ij}
=
\left(\frac{\partial\left({z_l}_i-\sum_{k=1}^{|\mathcal V|}\operatorname{exp}({z_l}_k)\right)}{\partial {z_l}_j}\right)_{ij}
=
\left(\delta_{ij}-{\pi_l}_j\right)_{ij}
=
I_V-\mathbf1_V\pi_l^\top\in\mathbb R^{V\times V}.
$$

整体的 $\mathcal A_t(\mathcal X_o)$ 是一个 $V\times L$ 到 $V\times L$ 的算子，或者说是一个 $V\times L\times V\times L$ 的矩阵。

由链式法则，有

$$
\begin{aligned}
\Delta\log\pi^t(\cdot\mid\mathcal X_o)
&=\mathcal A_t(\mathcal X_o)\,\Delta z(\mathcal X_o)\\
&=-\eta\,\mathcal A_t(\mathcal X_o)\,\mathcal K_t(\mathcal X_o,\mathcal X_u)\,\mathcal G_t(\mathcal X_u)+O(\eta^2),
\end{aligned}
$$

这正是所要证明的 AKG 分解。

## 定理 2 的证明

设 $\mathbf z^i(\mathcal X)\in\mathbb R^{|\mathcal V|}$ 为位置 $i$ 处的 logits 向量，并进一步记

$$
\boldsymbol\pi^i[v]
=
\frac{e^{\mathbf z^i[v]}}
{\sum_{u\in\mathcal V}e^{\mathbf z^i[u]}}
\quad (v\in\mathcal V).
$$

为位置 $i$ 处的概率分布。

令 $\mathbf t^i\in\mathbb R^{|\mathcal V|}$ 表示位置 $i$ 的某一个固定的目标分布。

逐 token 的负交叉熵为

$$
\mathcal L(\mathcal X_u)
=
-\sum_{i=1}^{L}\sum_{v\in\mathcal V}\mathbf t^i[v]\log\boldsymbol\pi^i[v].
\tag{2}
$$

由于

$$
\log\boldsymbol\pi^i[v]
=
\mathbf z^i[v]
-
\log\left(\sum_{u\in\mathcal V}e^{\mathbf z^i[u]}\right),
$$

因此对于某个 $r\in\mathcal V$，有

$$
\frac{\partial\log\boldsymbol\pi^i[v]}
{\partial\mathbf z^i[r]}
=
\mathbb 1\{v=r\}
-
\frac{e^{\mathbf z^i[r]}}
{\sum_{u\in\mathcal V}e^{\mathbf z^i[u]}}
=
\mathbb 1\{v=r\}-\boldsymbol\pi^i[r].
\tag{3}
$$

对式 (2) 关于 $\mathbf z^i[r]$ 求导，并使用式 (3)，得到

$$
\begin{aligned}
\frac{\partial\mathcal L(\mathcal X_u)}
{\partial\mathbf z^i[r]}
&=
-\sum_{v\in\mathcal V}\mathbf t^i[v]\,
\frac{\partial\log\boldsymbol\pi^i[v]}
{\partial\mathbf z^i[r]}\\
&=
-\sum_v\mathbf t^i[v]
\bigl(\mathbb 1\{v=r\}-\boldsymbol\pi^i[r]\bigr)\\
&=
-\mathbf t^i[r]
+
\left(\sum_v\mathbf t^i[v]\right)\boldsymbol\pi^i[r].
\end{aligned}
$$

由于 $\mathbf t^i$ 是概率分布：

$$
\sum_v\mathbf t^i[v]=1,
$$

代入上式，并把 $r$ 的结果扩展为词表向量，得到

$$
\nabla_{\mathbf z^i}\mathcal L(\mathcal X_u)
=
\boldsymbol\pi^i-\mathbf t^i.
\tag{4}
$$

对于 GA，有 $\mathbf t^i=\mathbf e_{y_u^i}$，因此

$$
\mathcal G_{\mathrm{GA}}^i
=
\boldsymbol\pi^i-\mathbf e_{y_u^i}.
$$

而 BS-T 使用如下凸组合目标：

$$
\mathbf t_{\mathrm{BST}}^i
=
(1-\lambda)\mathbf e_{y_u^i}
+
\lambda\mathbf q^i.
$$

根据 $\mathbf q^i$ 的停止梯度性质，代入式 (4)：

$$
\begin{aligned}
\mathcal G_{\mathrm{BST}}^i
&=
\nabla_{\mathbf z^i}\mathcal L(\mathcal X_u)\\
&=
\boldsymbol\pi^i-\mathbf t_{\mathrm{BST}}^i\\
&=
\boldsymbol\pi^i-
\bigl((1-\lambda)\mathbf e_{y_u^i}+\lambda\mathbf q^i\bigr).
\end{aligned}
$$

对于任意 $v\ne y_u^i$（因此 $\mathbf e_{y_u^i}[v]=0$），有

$$
\begin{aligned}
\mathcal G_{\mathrm{BST}}^i[v]
&=
\boldsymbol\pi^i[v]-\lambda\mathbf q^i[v]\\
&=
\bigl(\boldsymbol\pi^i[v]-\mathbf e_{y_u^i}[v]\bigr)
-\lambda\mathbf q^i[v]\\
&=
\mathcal G_{\mathrm{GA}}^i[v]-\lambda\mathbf q^i[v].
\end{aligned}
$$

这就证明了定理。

事实上，对于目标分量 $v=y_u^i$，有

$$
\begin{aligned}
\mathcal G_{\mathrm{BST}}^i[y_u^i]
&=
\boldsymbol\pi^i[y_u^i]
-
\bigl((1-\lambda)+\lambda\mathbf q^i[y_u^i]\bigr)\\
&=
\bigl(\boldsymbol\pi^i[y_u^i]-1\bigr)
+
\lambda\bigl(1-\mathbf q^i[y_u^i]\bigr)\\
&=
\mathcal G_{\mathrm{GA}}^i[y_u^i]
+
\lambda\bigl(1-\mathbf q^i[y_u^i]\bigr).
\end{aligned}
$$

也是有一定的遗忘增强作用的。

> 封面取自
> 
> https://osu.ppy.sh/beatmapsets/2553526#osu/5668439
> 
> KOTOKO - Wing my Way
